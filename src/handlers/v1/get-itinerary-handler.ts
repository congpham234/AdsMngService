import {
  GetItineraryRequestContent,
  GetItineraryResponseContent,
  PlaceToStay,
  Day as PlanningDay,
} from 'gopalapimodel';
import { TripPlanningProcessor } from '../../processors/trip-planning-processor';
import { inject, singleton } from 'tsyringe';
import { Day, PlanTripOutput } from '../../processors/models/plan-trip';
import { calculateDaysBetweenDates } from '../../utils/date-time-util';
import { DestinationSearchProcessor } from '../../processors/destination-search-processor';
import {
  Hotel,
  SearchDestinationHotelsOutput,
} from '../../processors/models/hotels';

@singleton()
export class GetItineraryHandler {
  constructor(
    @inject(TripPlanningProcessor)
    private tripPlanningProcessor: TripPlanningProcessor,
    @inject(DestinationSearchProcessor)
    private destinationSearchProcessor: DestinationSearchProcessor,
  ) {}

  public async process(
    request: GetItineraryRequestContent,
  ): Promise<GetItineraryResponseContent> {
    let totalDays = calculateDaysBetweenDates(
      request.startDate,
      request.endDate,
    );

    if (totalDays <= 0) {
      throw new Error('The end date must be after the start date.');
    }

    // Add 1 total day because the diff doesn't give include itself
    totalDays += 1;

    const placesToStay: PlaceToStay[] = await this.searchPlacesToStay(request);
    const planningDays: PlanningDay[] = await this.planTrip(request, totalDays);

    return {
      placesToStay,
      planningDays,
    };
  }

  private async planTrip(
    request: GetItineraryRequestContent,
    totalDays: number,
  ): Promise<PlanningDay[]> {
    const planTripOutput: PlanTripOutput =
      await this.tripPlanningProcessor.planTrip({
        query: request.destination.label,
        numOfDays: totalDays,
      });

    const planningDays: PlanningDay[] = [];

    planTripOutput.itinerary.forEach((day: Day) => {
      planningDays.push(this.mapDayToPlanningDay(day));
    });

    return planningDays;
  }

  private async searchPlacesToStay(
    request: GetItineraryRequestContent,
  ): Promise<PlaceToStay[]> {
    // TODO: Add Validation for searchDestinationHotelsOutput
    const searchDestinationHotelsOutput: SearchDestinationHotelsOutput =
      await this.destinationSearchProcessor.searchDestinationHotels({
        destId: request.destination.destId,
        searchType: request.destination.destType,
        startDate: request.startDate,
        endDate: request.endDate,
        numOfPeople: request.numOfPeople.toString(),
      });

    const placesToStay: PlaceToStay[] = [];

    searchDestinationHotelsOutput.hotels.forEach((hotel: Hotel) => {
      placesToStay.push(this.mapHotelToPlaceToStay(hotel));
    });

    return placesToStay;
  }

  private mapDayToPlanningDay(input: Day): PlanningDay {
    return input;
  }

  private mapHotelToPlaceToStay(input: Hotel): PlaceToStay {
    return {
      name: input.name,
      reviewScore: input.reviewScore,
      reviewCount: input.reviewCount,
      suggestedPrice: input.price.value,
      currency: input.price.currency,
      imageUrl1024x768: input.photoUrls.at(0),
    };
  }
}
